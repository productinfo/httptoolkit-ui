import * as _ from 'lodash';
import * as React from 'react';

import { styled } from '../../styles';
import { FontAwesomeIcon } from '../../icons';
import { filterProps } from '../component-utils';

const SearchInput = styled.input.attrs({
    type: 'text'
})`
    width: 100%;
    padding: 15px;
    box-sizing: border-box;

    border-radius: 4px;

    border: 1px solid ${p => p.theme.containerBorder};
    box-shadow: inset 0 2px 4px 1px rgba(0, 0, 0, 0.1);
    background-color: ${p => p.theme.popBackground};

    font-size: ${p => p.theme.headingSize};
`;

const ClearSearchButton = styled<React.ComponentType<{
    visible: boolean,
    icon: string[],
    size?: string,
    onClick: () => void
}>>(filterProps(FontAwesomeIcon, 'visible'))`
    position: absolute;

    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;

    display: ${p => p.visible ? 'block' : 'none'};
`;

export const SearchBox = styled((props: {
    className?: string,
    value: string,
    placeholder?: string,
    autoFocus?: boolean,
    onSearch: (input: string) => void,
    iconSize?: string
}) =>
    <div className={props.className}>
        <SearchInput
            autoFocus={props.autoFocus}
            value={props.value}
            placeholder={props.placeholder}
            onChange={(e) => props.onSearch(e.currentTarget.value.toLocaleLowerCase())}
        />
        <ClearSearchButton
            icon={['fas', 'times']}
            size={props.iconSize}
            onClick={() => props.onSearch('')}
            visible={!!props.value}
        />
    </div>
)`
    position: relative;
`;