import { createServer } from 'vite'

async function start() {
  const server = await createServer({
    configFile: false,
    root: process.cwd(),
    server: { port: 5173 }
  })

  await server.listen()
  console.log('Vite server started via server.js')
}

start().catch(err => {
  console.error(err)
  process.exit(1)
})
