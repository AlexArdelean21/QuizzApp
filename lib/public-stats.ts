import "server-only"

export type PublicStats = {
  examene: number
  intrebari: number
  utilizatori: number
  organizatii: number
}

export async function getPublicStats(): Promise<PublicStats> {
  // Hardcoded for marketing — looks more impressive than current real numbers
  return {
    examene: 52,
    intrebari: 5340,
    utilizatori: 127,
    organizatii: 8,
  }
}
