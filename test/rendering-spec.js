import React from 'react';
import {
  shallow,
  mount,
  generateComponentWithPlugin,
  generateComponentWithoutPlugin
} from './utils';

const myComponentInputCode = `
  const MyComponentRules = () => ({});
  const MyComponent = ReactFela.createComponent(MyComponentRules, 'div');
`;

describe('rendering component hierarchy', () => {
  describe('without the plugin', () => {
    // These tests are here for sanity checks.
    const MyComponent = generateComponentWithoutPlugin(myComponentInputCode);

    it('does not change the displayName', () => {
      expect(MyComponent.displayName).not.toEqual('MyComponent');
    });

    it('renders the outer wrapper with the default displayName', () => {
      const wrapper = shallow(
        <div>
          <MyComponent />
        </div>
      );
      expect(wrapper.find('MyComponentRules').exists()).toBe(true);
    });
  });

  describe('with the plugin', () => {
    const MyComponent = generateComponentWithPlugin(myComponentInputCode);

    it('changes the displayName', () => {
      expect(MyComponent.displayName).toEqual('MyComponent');
    });

    it('renders the outer wrapper with the displayName', () => {
      const wrapper = shallow(
        <div>
          <MyComponent />
        </div>
      );
      expect(wrapper.find('MyComponent').exists()).toBe(true);
    });

    it('does not mutate the inner display names', () => {
      const wrapper = mount(<MyComponent />);
      expect(wrapper.find('MyComponentRules').length).toBe(1);
      expect(wrapper.find('div').length).toBe(1);
    });

    describe('when assigned as a class property', () => {
      const plugins = [
        'transform-class-properties',
        [
          'module-resolver',
          {
            root: ['./src', './node_modules'],
            alias: {
              test: './test'
            }
          }
        ]
      ];

      const myParentComponentInputCode = `
        const MyChildComponentRules = () => ({});
        class MyComponent extends React.Component {
          static MyChildComponent = ReactFela.createComponent(MyChildComponentRules, 'div');

          render() {
            return MyComponent.MyChildComponent;
          }
        }
      `;

      const MyParentComponent = generateComponentWithPlugin(myParentComponentInputCode, plugins);
      it('sets the displayName', () => {
        expect(MyParentComponent.MyChildComponent.displayName).toEqual('MyChildComponent');
      });
    });
  });
});
