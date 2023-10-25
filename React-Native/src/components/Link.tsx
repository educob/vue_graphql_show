import {Link as Ln} from 'native-base';
import React from 'react';

type Align = 'flex-end' | 'flex-start' | 'flex-center';

export type ILinkProps = {
  text: string;
  to: Function | string;
  align?: Align;
};

export const Link: React.FC<ILinkProps> = ({text = 'Link...', align, to}) => {
  const navigate = () => {
    if (typeof to !== 'string') {
      to();
    }
  };

  return (
    <Ln
      _text={{
        color: 'indigo.500',
        fontWeight: 'medium',
        fontSize: 'sm',
      }}
      alignSelf={align}
      onPress={navigate}
      href={typeof to === 'string' ? to : undefined}>
      {text}
    </Ln>
  );
};
