export default interface Service<TEntity> {
  findById: (id: string) => Promise<TEntity | null>;
  getAll: () => Promise<TEntity[]>;
  editInfo: (input: TEntity, id: string) => Promise<TEntity>;
}
