async function getCountries(request, reply) {
  try {
    reply.header('Content-Type', 'application/json; charset=utf-8');

    const result = await request.server.pg.query(
      'SELECT id, name, code, flag_emoji, description FROM sapi.countries ORDER BY name ASC'
    );

    return {
      success: true,
      data: result.rows
    };
  } catch (error) {
    request.log.error(error);
    reply.code(500);
    return {
      success: false,
      error: error.message || 'Failed to fetch countries'
    };
  }
}

async function getCountryByCode(request, reply) {
  try {
    reply.header('Content-Type', 'application/json; charset=utf-8');

    const { code } = request.params;

    const result = await request.server.pg.query(
      'SELECT id, name, code, flag_emoji, description FROM sapi.countries WHERE code = $1',
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      reply.code(404);
      return {
        success: false,
        error: 'Country not found'
      };
    }

    return {
      success: true,
      data: result.rows[0]
    };
  } catch (error) {
    request.log.error(error);
    reply.code(500);
    return {
      success: false,
      error: error.message || 'Failed to fetch country'
    };
  }
}

module.exports = {
  getCountries,
  getCountryByCode
};
