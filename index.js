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

function rewriteHeaders(headers) {
  console.log(headers);
  return headers;
}

proxy.post('/oauth/token', (request, reply) => {
  reply.from('/oauth/token', {rewriteHeaders, body: {
    ...request.body,
    client_id: config.RubyChina.client_id,
    client_secret: config.RubyChina.client_secret
  }});
});

proxy.all('/*', (request, reply) => reply.from(request.req.url));

proxy.listen(4000, (err) => {
  if (err) throw err;
});
