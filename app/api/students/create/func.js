const app = require('@/app')
const errors = require('@/errors')
const _ = require('lodash')

module.exports = async(context) => {
  const { aluno_id, ra, login } = context.body

  if(!aluno_id) {
    throw new errors.BadRequest.MissingParameter('aluno_id')
  }

  const season = app.helpers.season.findSeasonKey()
  const Alunos = app.models.alunos.bySeason(season)
  const Disciplinas = app.models.disciplinas.bySeason(season)

  // check if already passed, if so does no update this user anymore
  const isPrevious = await Disciplinas.count({ before_kick: { $exists: true, $ne: [] }})
  if(isPrevious) {
    return await Alunos.findOne({ aluno_id: aluno_id })
  }

  const cursos = (context.body.cursos || []).map(async c => {
    let courseCleaned = c.curso.trim().replace('↵', '').replace(/\s+/g, ' ')
    let cpLastQuad = null
    if(season == '2020:3') {
      const history = await app.models.historiesGraduations.findOne({ ra: ra, curso: courseCleaned })
      cpLastQuad = _.get(history, 'coefficients.2019.3.cp_acumulado', c.cp)
    }

    c.cr = app.helpers.parse.toNumber(c.cr)
    c.cp = app.helpers.parse.toNumber(cpLastQuad),
    c.quads = app.helpers.parse.toNumber(c.quads)
    c.nome_curso = courseCleaned
    c.ind_afinidade = (0.07 * c.cr) + (0.63 * c.cp) + (0.005 * c.quads)

    if(c.curso_id) {
      c.id_curso = c.curso_id
    }
    return c
  })

  return await Alunos.findOneAndUpdate({
    aluno_id: aluno_id
  }, {
    cursos: await Promise.all(cursos),
    ra: ra,
    login: login
  }, {
    new: true,
    upsert: true
  })
}