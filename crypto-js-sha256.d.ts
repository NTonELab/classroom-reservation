declare module 'crypto-js/sha256' {
  const SHA256: (message: string) => {
    toString: () => string
  }

  export default SHA256
}