import { userRepository as repo } from './repository.ts'

type Row = NonNullable<Awaited<ReturnType<typeof repo.get>>>

const toDto = ({ _count, ...user }: Row) => ({ ...user, assignmentCount: _count.assignments })

export const userService = {
  async list(search?: string) {
    return (await repo.list(search)).map(toDto)
  },

  async get(id: string) {
    const user = await repo.get(id)
    return user && toDto(user)
  },
}
