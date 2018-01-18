const transformReactFelaDisplayName = ({ types: t }) => {
  const functionNameRegEx = /^createComponent(WithProxy)?$/;
  const reactFelaPackageRegEx = /react-fela(\/.*(\.js)?)?$/;

  const injectDisplayName = (initialLineNodePath, componentName) => {
    const left = t.memberExpression(t.identifier(componentName), t.identifier('displayName'));
    const right = t.stringLiteral(componentName);
    const displayNameAssignment = t.assignmentExpression('=', left, right);
    initialLineNodePath.insertAfter(displayNameAssignment);
  };

  const identifierComesFromReactFela = (identifierDeclarationPath, calleeName) => {
    const reactFelaRegEx = /react-fela(\/index(\.js)?)?$/;
    const { scope: { bindings } } = identifierDeclarationPath;
    if (!bindings[calleeName]) return false;
    const sourcePath = bindings[calleeName].path;
    // console.log(identifierDeclarationPath.node);

    if (sourcePath.isImportSpecifier() && sourcePath.parentPath.isImportDeclaration()) {
      // Handle cases where the function is imported destructured. For example:
      //
      // import { createComponent } from 'react-fela';
      // /* or */
      // import { createComponentWithProxy }j from 'react-fela';
      //
      const {
        parent: { source: { value: sourceImportFrom } },
        node: { imported: { name: importedName } }
      } = sourcePath;
      const isFromReactFela = reactFelaRegEx.test(sourceImportFrom);
      const validImportedName = functionNameRegEx.test(importedName);
      return isFromReactFela && validImportedName;
    }
    return false;
  };

  return {
    name: 'transform-react-fela-display-name',
    visitor: {
      VariableDeclarator(path) {
        // Match cases such as:
        //
        // const x = y;
        //
        const { node: { id, init, init: { callee } } } = path;

        if (t.isCallExpression(init)) {
          // Match cases such as:
          //
          // const x = y();
          //
          const componentName = id.name;
          const initialLineNodePath = path.parentPath;

          if (
            callee.name &&
            callee.name.match(functionNameRegEx) &&
            identifierComesFromReactFela(path, callee.name)
          ) {
            // Match cases such as:
            //
            // const x = createComponent(...);
            // /* or */
            // const y = createComponentWithProxy(...);
            //
            injectDisplayName(initialLineNodePath, componentName);
          } else if (t.isMemberExpression(callee)) {
            // This handles default imports of createComponent functions. For example:
            //
            // import ReactFela from 'react-fela';
            // const renameIt = createComponent;
            // const MyComponent = renameIt(...);
            //
            const { object: { name: importedName } } = callee;
            const { scope: { bindings } } = path;
            if (!bindings[importedName]) return;
            const { path: { parent } } = bindings[importedName];
            if (t.isImportDeclaration(parent)) {
              const { path: { parent: { source: { value } } } } = bindings[importedName];

              if (reactFelaPackageRegEx.test(value)) {
                injectDisplayName(initialLineNodePath, componentName);
              }
            }
          } else {
            const { scope: { bindings } } = path;
            const functionBinding = bindings[callee.name];
            if (!functionBinding) return;
            const { path: { node: { init: bindingInit } } } = functionBinding;

            if (
              t.isIdentifier(bindingInit) &&
              identifierComesFromReactFela(functionBinding.path, bindingInit.name)
            ) {
              // This handles renaming of the createComponent functions. For example:
              //
              // import { createComponent } from 'react-fela';
              // const renameIt = createComponent;
              // const MyComponent = renameIt(...);
              //
              injectDisplayName(initialLineNodePath, componentName);
            }
          }
        }
      }
    }
  };
};

export default transformReactFelaDisplayName;
