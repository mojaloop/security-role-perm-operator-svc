#!/bin/bash
NAMESPACE=moja-operator
OPERATION=$1

helpFunction()
{
   echo ""
   echo "Usage: $0 apply|delete"
   echo -e "\tapply - To apply the resources in K8S"
   echo -e "\tdelete - To detel the resources in K8S"
   exit 1 # Exit script after printing help
}

case "$OPERATION" in
  apply ) echo "Applying Changes" ;;
  delete ) echo "Deleting Changes" ;;
  * ) helpFunction ;;
esac

kubectl -n $NAMESPACE $OPERATION -f resources/moja-operator-namespace.yaml
kubectl -n $NAMESPACE $OPERATION -f resources/mojaloop-namespace.yaml
kubectl -n $NAMESPACE $OPERATION -f resources/moja-role-operator-sa.yaml
kubectl -n $NAMESPACE $OPERATION -f resources/mojalooprole-crd.yaml
kubectl -n $NAMESPACE $OPERATION -f resources/mojalooprole-editor-role.yaml
kubectl -n $NAMESPACE $OPERATION -f resources/moja-role-operator-clusterrolebinding.yaml
kubectl -n $NAMESPACE $OPERATION -f resources/moja-role-operator-deployment.yaml
