## Mojaloop Role Permission Operator (For K8S)
[![Git Commit](https://img.shields.io/github/last-commit/mojaloop/security-role-perm-operator-svc.svg?style=flat)](https://github.com/mojaloop/security-role-perm-operator-svc/commits/master)
[![Git Releases](https://img.shields.io/github/release/mojaloop/security-role-perm-operator-svc.svg?style=flat)](https://github.com/mojaloop/security-role-perm-operator-svc/releases)
[![CircleCI](https://circleci.com/gh/mojaloop/security-role-perm-operator-svc.svg?style=svg)](https://circleci.com/gh/mojaloop/security-role-perm-operator-svc)

K8S operator which watches the custom resource MojaloopRole.

The service aggregates the permissions based on all the custom resources and update tuples in Ory Keto service.

## Runtime Configuration

Runtime configuration is handled by `rc`, and can be specified using either Environment Variables, or a `.json` file.

See [`./config/default.json`](./config/default.json) for an example config file.

When setting configuration using environment variables, the `ROLE_PERM_OPERATOR` environment variable prefix is required. See [`src/shared/config.ts`](src/shared/config.ts) to understand how these variables are configured.

### Key Config Options

> ***Note:** See [`./config/default.json`](./config/default.json) for all available config options, and their default values.*


## Setup for developer

### Clone repo
```bash
git clone git@github.com:mojaloop/security-role-perm-operator-svc.git
```

### Install service dependencies
```bash
cd security-role-perm-operator-svc
npm ci
```

### Install and start minikube
```bash
minikube start
```

### Run the service with NPM locally (Connects with the current K8S context in the local machine)

```bash
npm run startDev
```