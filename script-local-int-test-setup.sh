#!/bin/bash

# Check k8s connectivity
if ! kubectl cluster-info &> /dev/null; then
    echo "Error: Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

# Check if mojaloop namespace exists
if ! kubectl get namespace mojaloop &> /dev/null; then
    echo "Error: Namespace 'mojaloop' does not exist."
    exit 1
fi

export ROLE_PERM_OPERATOR_ORY_KETO_READ_SERVICE_URL=http://localhost:4466
export PERMISSION_EXCLUSIONS_OPERATOR_ORY_KETO_READ_SERVICE_URL=http://localhost:4466
export PERMISSION_EXCLUSIONS_VALIDATION_ORY_KETO_READ_SERVICE_URL=http://localhost:4466
export PERMISSION_EXCLUSIONS_VALIDATION_PERMISSION_OPERATOR_API_URL=http://localhost:3001

kubectl port-forward -n mojaloop svc/moja-keto-service 4466:4466 &
KETO_PID=$!
kubectl port-forward -n mojaloop svc/moja-role-operator 3001:3001 &
OPERATOR_PID=$!

echo $KETO_PID > .port-forward-pids
echo $OPERATOR_PID >> .port-forward-pids

echo "Port forwards started with PIDs: $KETO_PID (keto), $OPERATOR_PID (operator)"
echo "PIDs saved to .port-forward-pids"

