import {Heading} from 'native-base';
import React from 'react';

export type IH2Props = {
  text: string;
  color?: string;
};

export const H2: React.FC<IH2Props> = ( { text = 'H1 Subtitle', color = '#d0d0d0' } ) => {
  return (
    <Heading
      size="lg"
      fontWeight="300"
      color={color}
      _dark={{
        color,
      }}>
      {text}
    </Heading>
  );
};
