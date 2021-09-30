#!/bin/bash
NAMESPACE=moja-operator
OPERATION=$1

kubectl apply -f resources/moja-operator-namespace.yaml
kubectl apply -f resources/mojaloop-namespace.yaml
kubectl -n $NAMESPACE apply -f resources/moja-role-operator-sa.yaml
kubectl -n $NAMESPACE apply -f resources/mojalooprole-crd.yaml
kubectl -n $NAMESPACE apply -f resources/mojalooprole-editor-role.yaml
kubectl -n $NAMESPACE apply -f resources/moja-role-operator-clusterrolebinding.yaml
kubectl -n $NAMESPACE apply -f resources/moja-role-operator-deployment.yaml
kubectl -n $NAMESPACE apply -f resources/moja-keto.yaml
kill -9 $(pgrep -f "minikube tunnel")
nohup minikube tunnel -c > /dev/null 2>&1 &