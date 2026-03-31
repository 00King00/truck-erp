import { getConnectionToken } from '@nestjs/mongoose';
import { Connection, Model, Schema } from 'mongoose';

export function createModelProvider<TDocument>(
  cls: { name: string },
  schema: Schema,
) {
  return {
    provide: `${cls.name}Model`,
    useFactory: (connection: Connection): Model<TDocument> =>
      connection.model<TDocument>(cls.name, schema),
    inject: [getConnectionToken()],
  };
}
