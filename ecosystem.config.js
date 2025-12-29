module.exports = {
  apps: [
    {
      name: "pokedex-server",
      script: "npm",
      args: "run dev",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],

  deploy: {
    production: {
      user: "ubuntu",
      host: "my-ec2-dev",
      ref: "origin/main",
      repo: "git@github.com:ilayG0/moongodb-first-proj.git",
      path: "/home/ubuntu/pokedex-server",
      ssh_options: "StrictHostKeyChecking=no",
      "pre-deploy-local": "echo 'Deploying code to EC2'",
      "post-deploy":
        `. /home/ubuntu/.nvm/nvm.sh; npm install; pm2 startOrReload ecosystem.config.js --env production`,
      env: {
        NODE_ENV: "production",
      },
    },
  },
};
