#!/bin/bash
NAMESPACE=moja-operator
OPERATION=$1
kubectl -n $NAMESPACE delete -f resources/moja-role-operator-deployment.yaml
kubectl -n $NAMESPACE delete -f resources/moja-role-operator-clusterrolebinding.yaml
kubectl -n $NAMESPACE delete -f resources/mojalooprole-editor-role.yaml
kubectl -n $NAMESPACE delete -f resources/mojalooprole-crd.yaml
kubectl -n $NAMESPACE delete -f resources/moja-role-operator-sa.yaml
kubectl -n $NAMESPACE delete -f resources/moja-keto.yaml
kubectl delete -f resources/mojaloop-namespace.yaml
kubectl delete -f resources/moja-operator-namespace.yaml

