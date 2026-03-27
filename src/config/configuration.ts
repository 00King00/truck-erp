export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/truck-erp',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'changeme',
  },
});
