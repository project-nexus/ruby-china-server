const Fastify = require('fastify')
const config = require('./config.json');

if (process.env.NODE_ENV !== 'production'){
  require('longjohn');
}

const proxy = Fastify({
  logger: true
})

proxy.register(require('fastify-reply-from'), {
  base: 'https://ruby-china.org'
});

proxy.post('/oauth/token', (request, reply) => {
  reply.from('/oauth/token', {
    body: {
      ...request.body,
      client_id: config.RubyChina.client_id,
      client_secret: config.RubyChina.client_secret
    }, 
    onResponse: (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        body += chunk
      })
      res.on('end', (err) => {
        if (err) console.log(err)
        body = JSON.parse(body)
        reply.header('Set-Cookie', [
          `access_token=${body.access_token}; Expires=${cookieExpires(body.created_at, body.expires_in)}; HttpOnly;`,
          `refresh_token=${body.refresh_token}; Expires=${cookieExpires(body.created_at)}; HttpOnly;`
        ])
        reply.send(body)
      })
    }
  });
});

proxy.all('/*', (request, reply) => reply.from(request.req.url));

proxy.listen(4000, (err) => {
  if (err) throw err;
});

// unixTimestamp, default expires is 30 days  
function cookieExpires(unixTimestamp, expiresIn) {
  if (expiresIn) {
    return new Date((unixTimestamp+expiresIn)*1000).toUTCString();
  } else {
    return new Date((unixTimestamp+30*24*60*60)*1000).toUTCString();
  }
}
