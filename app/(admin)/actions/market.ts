"use server";

export async function fetchLiveMarketRates() {
  try {
    const apiKey = process.env.METALS_DEV_API_KEY;
    if (!apiKey) throw new Error("METALS_DEV_API_KEY not set");

    const url = `https://api.metals.dev/v1/latest?api_key=${apiKey}&currency=INR&unit=g`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' },
    });
    const data = await res.json();

    if (data.status !== 'success') throw new Error("API returned error");

    const silverRate = data.metals?.silver || 0;
    const usdInrRate = data.currencies?.USD || 0;

    return {
      success: true,
      silverRate,
      usdInrRate,
      fetchedAt: new Date().toISOString(),
      fredObservationDate: null,
      metalsTimestamp: data.timestamps?.metal || null,
      error: null
    };

  } catch (error) {
    console.error("Failed to fetch market rates:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      silverRate: 0,
      usdInrRate: 0,
      fetchedAt: new Date().toISOString(),
      fredObservationDate: null,
      metalsTimestamp: null,
      error: message
    };
  }
}
