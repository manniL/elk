export default defineNuxtRouteMiddleware(async (to, from) => {
  if (process.server)
    return

  const masto = useMasto()

  // Skip running middleware before masto has been initialised
  if (!masto)
    return

  if (!('server' in to.params))
    return

  const user = currentUser.value

  if (!user) {
    if (from.params.server !== to.params.server) {
      await masto.loginTo({
        server: to.params.server as string,
      })
    }
    return
  }

  // No need to additionally resolve an id if we're already logged in
  if (user.server === to.params.server)
    return

  // Tags don't need to be redirected to a local id
  if (to.params.tag)
    return

  // Handle redirecting to new permalink structure for users with old links
  if (!to.params.server) {
    return {
      ...to,
      params: {
        ...to.params,
        server: user.server,
      },
    }
  }

  try {
    // If we're already on an account page, we can search for this on the new instance
    if (to.params.account && to.name !== 'status' && to.params.account.includes('@')) {
      const account = await fetchAccountByHandle(to.params.account as string)
      if (account)
        return getAccountRoute(account)
    }

    if (!masto.loggedIn.value)
      await masto.loginTo(currentUser.value)

    // If we're logged in, search for the local id the account or status corresponds to
    const { value } = await masto.v2.search({ q: `https:/${to.fullPath}`, resolve: true, limit: 1 }).next()

    const { accounts, statuses } = value
    if (statuses[0])
      return getStatusRoute(statuses[0])

    if (accounts[0])
      return getAccountRoute(accounts[0])
  }
  catch (err) {
    console.error(err)
  }

  return '/home'
})
