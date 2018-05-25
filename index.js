const Fastify = require('fastify')


const proxy = Fastify({
  logger: true
})

proxy.register(require('fastify-reply-from'), {
  base: 'https://ruby-china.org/'
});

function rewriteHeaders(headers) {
  console.log(headers);
  return headers;
}

proxy.post('/auth/token', (request, reply) => {
  reply.from('/auth/token', {rewriteHeaders});
});


proxy.listen(4000, (err) => {
  if (err) throw err;
});
