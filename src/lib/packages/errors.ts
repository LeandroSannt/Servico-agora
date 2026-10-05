// Lançado dentro da transação da OS quando o saldo não cobre o pedido.
// A rota captura e responde 409 { error, serviceId, remaining }.
export class InsufficientBalanceError extends Error {
  constructor(
    public readonly serviceId: string,
    public readonly remaining: number
  ) {
    super('Saldo do pacote insuficiente')
    this.name = 'InsufficientBalanceError'
  }
}
