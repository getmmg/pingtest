import { createServer } from 'vite'

async function start() {
  const server = await createServer({
    configFile: false,
    root: process.cwd(),
    server: { port: 5173 }
  })

  await server.listen()
  // eslint-disable-next-line no-console
  console.log('Vite server started via server.ts')
}

start().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
