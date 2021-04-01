export const fetchAPY = async (pid: number): Promise<number> => {
  let response
  try {
    response = await fetch(`https://api.baoview.xyz/api/v1/pool-metrics/apy?pid=${pid}&limit=1`)
  } catch (error) {
    console.debug('Failed to fetch APY', error)
  }

  if (!response?.ok) {
    throw new Error(`Failed to fetch APY`)
  }

  const json: { data: { c: number }[] } = await response?.json()

  return json.data.length && json.data[0].c
}
