const Fastify = require('fastify')
const querystring = require('querystring')
const zlib = require('zlib')
const config = require('./config.json')

if (process.env.NODE_ENV !== 'production'){
  require('longjohn')
}

const proxy = Fastify({
  logger: true
})

proxy.register(require('fastify-cookie'), (err) => {
  if (err) throw err
})

proxy.register(require('fastify-reply-from'), {
  base: 'https://ruby-china.org'
})

proxy.post('/oauth/token', (request, reply) => {

  reply.from('/oauth/token', {
    body: {
      ...request.body,
      client_id: config.RubyChina.client_id,
      client_secret: config.RubyChina.client_secret
    }, 
    onResponse: (res) => {
      parseResponse(reply, res, data => {
        const cookies = []
        cookies.push(generateCookieString('access_token', data.access_token, data.created_at+data.expires_in-10*60))
        cookies.push(generateCookieString('refresh_token', data.refresh_token, data.created_at+30*24*60*60))
        copyHeaders(reply.headers, reply)
        reply.header('Set-Cookie', cookies)
        reply.send(res)
      })
    }
  })
})

proxy.all('/*', (request, reply) => {
  reply.from(request.req.url, {
    queryString: {
      access_token: req.cookies.access_token
    }
  })
})

proxy.listen(4000, (err) => {
  if (err) throw err
})

function generateCookieString(key, value, expires) {
  if (typeof expires === 'number') {
    expires = new Date(expires*1000).toUTCString()
  }
  return `${key}=${value}; Expires=${expires}; Path=/; HttpOnly;`
}

function parseResponse(reply, response, fn) {
  const encoding = response.headers['content-encoding']
  const bufs = []

  response.on('data', onData)
  response.on('end', onEnd)
  response.on('error', onError)

  function onData(chunk) {
    bufs.push(chunk)
  }

  function onEnd(err) {
    if (err) throw err
    const body = Buffer.concat(bufs)

    if (encoding === 'gzip') {
      zlib.unzip(body, (err, buf) => {
        if (err) throw err
        const data = JSON.parse(buf.toString())
        fn(data)
     })
    } else {
      const data = JSON.parse(body.toString())
      fn(data)
    }
  }

  function onError(err) {
    if (err) throw err
  }
}

function copyHeaders(headers, reply) {
  const headersKeys = Object.keys(headers)

  var header
  var i

  for (i = 0; i < headersKeys.length; i++) {
    header = headersKeys[i]
    if (header.charCodeAt(0) !== 58) {
      reply.header(header, headers[header])
    }
  }
}





