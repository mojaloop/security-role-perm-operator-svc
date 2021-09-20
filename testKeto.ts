import { KetoTuples } from './src/keto-tuples'

const sampleFn = async () => {
  const oryKeto = new KetoTuples()
  // const permissions = await oryKeto.getRolePermissions('LevelOneAdmin')
  const desiredPermissions = [
    'deployService',
    'listService',
    'uninstallService',
  ]
  await oryKeto.updateRolePermissions('LevelOneAdmin', desiredPermissions)

  const permissions = await oryKeto.getRolePermissions('LevelOneAdmin')
  console.log(permissions)
}


sampleFn()




