eval $(minikube -p minikube docker-env)
docker build -t mojaloop/security-role-perm-operator-svc:local .