eval $(minikube -p minikube docker-env)
docker build -t moja-operator-keto:local .