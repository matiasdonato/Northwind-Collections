/** Violación de una regla de negocio: se traduce a HTTP 400 en la capa de infraestructura */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

/** Recurso inexistente: se traduce a HTTP 404 en la capa de infraestructura */
export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} no encontrado`);
    this.name = 'NotFoundError';
  }
}
