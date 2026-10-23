// Static settings live in app.json. The web build is served from a sub-path on GitHub Pages, so
// the base URL comes from the environment and stays empty for the dev server and for phones.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
