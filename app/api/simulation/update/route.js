const app = require('@/app')

module.exports = async(router) => {
  router.put('/simulation',
    app.helpers.routes.func(require('./func.js')))
}