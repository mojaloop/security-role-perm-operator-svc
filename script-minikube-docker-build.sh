eval $(minikube -p minikube docker-env)
docker build -t role-perm-operator:local .