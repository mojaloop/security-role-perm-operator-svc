#!/bin/bash
NAMESPACE=mojaloop
OPERATION=$1

kubectl apply -f resources/mojaloop-namespace.yaml
kubectl -n $NAMESPACE apply -f resources/moja-role-operator-sa.yaml
kubectl -n $NAMESPACE apply -f resources/mojalooprole-crd.yaml
kubectl -n $NAMESPACE apply -f resources/mojaloop-permission-exclusions-crd.yaml
kubectl -n $NAMESPACE apply -f resources/mojalooprole-editor-role.yaml
kubectl -n $NAMESPACE apply -f resources/moja-role-operator-rolebinding.yaml
kubectl -n $NAMESPACE apply -f resources/moja-role-operator-deployment.yaml
kubectl -n $NAMESPACE apply -f resources/moja-keto.yaml
