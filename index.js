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
      parseResponse(reply, res, (data) => {
        reply.header('Set-Cookie', [
          `access_token=${data.access_token}; Expires=${cookieExpires(data.created_at, data.expires_in)}; HttpOnly;`,
          `refresh_token=${data.refresh_token}; Expires=${cookieExpires(data.created_at)}; HttpOnly;`
        ])
        reply.send(body)
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

// unixTimestamp, default expires is 30 days  
function cookieExpires(unixTimestamp, expiresIn) {
  if (expiresIn) {
    return new Date((unixTimestamp+expiresIn-10*60)*1000).toUTCString()
  } else {
    return new Date((unixTimestamp+30*24*60*60)*1000).toUTCString()
  }
}

function setCookie(key, value, expires) {
  if (typeof expires === 'number') {
    expires = new Date(expires*1000).toUTCString()
  }
  return `${key}=${value}; Expires=${expires}; HttpOnly;`
}

function parseResponse(reply, response, fn) {
  const encoding = response.headers['content-encoding']
  const bufs = []

  response.on('data', onData)
  response.on('end', onEnd)


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
}





