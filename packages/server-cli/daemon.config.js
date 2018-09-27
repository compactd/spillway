module.exports = {
  apps: [
    {
      name: 'spillway-server',
      script: __dirname + '/bin/server',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
