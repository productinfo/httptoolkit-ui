import * as _ from 'lodash';
import * as React from 'react';
import { IObservableValue, observable, autorun, action } from 'mobx';
import { disposeOnUnmount, observer } from 'mobx-react';

import { HtkRequest, HtkResponse } from '../../types';
import { styled, css } from '../../styles';
import { HtkContentType, getCompatibleTypes } from '../../content-types';
import { decodeContent } from '../../workers/worker-api';

import { ExchangeCard } from './exchange-card';
import { Pill, PillSelector } from '../common/pill';
import { ContentEditor, getContentEditorName } from '../editor/content-editor';
import { FontAwesomeIcon } from '../../icons';

function getReadableSize(bytes: number, siUnits = true) {
    let thresh = siUnits ? 1000 : 1024;

    let units = siUnits
        ? ['bytes', 'kB','MB','GB','TB','PB','EB','ZB','YB']
        : ['bytes', 'KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];

    let unitIndex = bytes === 0 ? 0 :
        Math.floor(Math.log(bytes) / Math.log(thresh));

    let unitName = bytes === 1 ? 'byte' : units[unitIndex];

    return (bytes / Math.pow(thresh, unitIndex)).toFixed(1).replace(/\.0$/, '') + ' ' + unitName;
}

const EditorCardContent = styled.div`
    margin: 0 -20px -20px -20px;
    border-top: solid 1px ${p => p.theme.containerBorder};
    background-color: ${p => p.theme.popBackground};

    .monaco-editor-overlaymessage {
        display: none;
    }
`;

const LoadingCardContent = styled.div<{ height?: string }>`
    ${p => p.height && css`
        height: ${p.height};
    `}

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
`;

type ExchangeMessage = HtkRequest | HtkResponse;

@observer
export class ExchangeBodyCard extends React.Component<{
    title: string,
    message: ExchangeMessage,
    direction: 'left' | 'right',
    collapsed: boolean,
    onCollapseToggled: () => void
}> {

    @observable
    private selectedContentType: HtkContentType | undefined;

    private static decodedBodyCache = new WeakMap<
        ExchangeMessage, IObservableValue<undefined | Buffer>
    >();

    componentDidMount() {
        disposeOnUnmount(this, autorun(() => {
            const message = this.props.message;

            if (!message) {
                this.setContentType(undefined);
                return;
            }

            if (ExchangeBodyCard.decodedBodyCache.get(message) === undefined) {
                const observableResult = observable.box<undefined | Buffer>(undefined);
                ExchangeBodyCard.decodedBodyCache.set(message, observableResult);

                decodeContent(message.body.buffer, message.headers['content-encoding'])
                .then(action<(result: Buffer) => void>((decodingResult) => {
                    observableResult.set(decodingResult);

                    // Necessary as a read for this key before the observable was
                    // created will not be subscribed to this update.
                    if (this.props.message === message) {
                        this.forceUpdate();
                    }
                }))
                // Ignore errors for now - for broken encodings just spin forever
                .catch(() => {});
            }
        }));
    }

    @action.bound
    setContentType(contentType: HtkContentType | undefined) {
        if (contentType === this.props.message.contentType) {
            this.selectedContentType = undefined;
        } else {
            this.selectedContentType = contentType;
        }
    }

    render() {
        const {
            title,
            message,
            direction,
            collapsed,
            onCollapseToggled
        } = this.props;

        const compatibleContentTypes = getCompatibleTypes(message.contentType, message.headers['content-type']);
        const contentType = _.includes(compatibleContentTypes, this.selectedContentType) ?
            this.selectedContentType! : message.contentType;

        const decodedBodyCache = ExchangeBodyCard.decodedBodyCache.get(message);
        const decodedBody = decodedBodyCache ? decodedBodyCache.get() : undefined;

        return <ExchangeCard
            direction={direction}
            collapsed={collapsed}
            onCollapseToggled={onCollapseToggled}
        >
            <header>
                { decodedBody && <Pill>{ getReadableSize(decodedBody.length) }</Pill> }
                <PillSelector<HtkContentType>
                    onChange={this.setContentType}
                    value={contentType}
                    options={compatibleContentTypes}
                    nameFormatter={getContentEditorName}
                />
                <h1>{ title }</h1>
            </header>
            { decodedBody ?
                <EditorCardContent>
                    <ContentEditor
                        rawContentType={message.headers['content-type']}
                        contentType={contentType}
                    >
                        {decodedBody}
                    </ContentEditor>
                </EditorCardContent>
            :
                <LoadingCardContent height='500px'>
                    <FontAwesomeIcon spin icon={['fas', 'spinner']} size='8x' />
                </LoadingCardContent>
            }
        </ExchangeCard>;
    }

}