import { useState, useEffect, ChangeEvent, MouseEvent, ChangeEventHandler, MouseEventHandler } from 'react';
import { safeJsonParse, camelize, formatAddress, getChainFromId } from '../helpers/utils';
import { Chain } from '../models/chain';
import { map, find, keys } from 'underscore';
import { TenderlyManager } from '../models/tenderlyManager';
import { FlashState, ChainConfig, FaucetProps } from '../helpers/interfaces';
import ChainSelect from './chainSelect';
import ForkUrlInput from './forkUrlInput';
import SubmitButton from './submitButton';

const config: ChainConfig = require('../configs/chains.json');
// toAddress: string;
// chain: string;
// token: string;
// forkUrl: string;
// tokenAmount: number;
// flashMsg: string;
// cauldronAddress: string;
// holderAddresses: string;

const chainOptions = map(keys(config), (key) => new Chain(key, config[key].imageUrl));

export default function Faucet(props: FaucetProps) {
  const [toAddress, setToAddress] = useState('');
  const [forkUrl, setForkUrl] = useState('');
  const [chain, setChain] = useState('ETH');
  const [holderAddresses, setHolderAddresses] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [tenderlyManager, setTenderlyManager] = useState<TenderlyManager | undefined>(undefined);

  useEffect(() => setTenderlyManager(new TenderlyManager(chain, forkUrl)), [forkUrl, chain]);

  useEffect(function () {
    setForkUrl(safeJsonParse(window.localStorage.getItem('forkUrl')));
    setToAddress(safeJsonParse(window.localStorage.getItem('toAddress')));
    setHolderAddresses(safeJsonParse(window.localStorage.getItem('holderAddresses')));
    setTokenAddress(safeJsonParse(window.localStorage.getItem('tokenAddress')));
    setTokenAmount(safeJsonParse(window.localStorage.getItem('tokenAmount')));
  }, []);

  function saveToLocalStorage(key: string, value: string) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function handleChange(key: string, value: string, setter: Function) {
    if (key == 'chain') {
      saveToLocalStorage('tokenAddress', '');
      setTokenAddress('');
    }

    saveToLocalStorage(key, value);
    setter(value);
  }

  function isAddress(value: string) {
    return value.toLowerCase().substring(0, 2) === '0x';
  }

  function handleTokenChange(event: ChangeEvent<HTMLInputElement>) {
    var tokenAddress = '';
    console.log(event.target.value);
    if (isAddress(event.target.value)) {
      tokenAddress = event.target.value;
    } else {
      tokenAddress = config[chain].tokens[event.target.value];
    }
    console.log('tokenAddress', tokenAddress);
    handleChange('tokenAddress', tokenAddress, setTokenAddress);
  }

  function getTokenAddressOptions() {
    let rows = [];
    for (let [token, address] of Object.entries(config[chain].tokens)) {
      rows.push(
        <option value={address as string} key={token}>
          {token}
        </option>
      );
    }
    return rows;
  }

  async function handleSubmit(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    if (tenderlyManager == null) return;
    setIsSubmitting(true);

    let result = await tenderlyManager.addTokenToWallet(
      tokenAddress,
      toAddress,
      parseFloat(tokenAmount),
      holderAddresses.split(',')
    );

    if (result.status == 'success') {
      showFlashMessage({
        type: 'success',
        boldMessage: 'Success!',
        message: `Sent ${tokenAmount} ${getTokenNameFromAddress(tokenAddress).toUpperCase()} to ${formatAddress(
          toAddress
        )}`,
      });
    } else {
      showFlashMessage({
        type: 'error',
        boldMessage: 'Porcodillo!',
        message: `Error: ${result.msg}`,
      });
    }
    setIsSubmitting(false);
    event.preventDefault();
  }

  function renderInputGroup(
    name: string,
    label: string,
    placeholder: string,
    stateVariable: string,
    onChangeFn: ChangeEventHandler,
    optionalArgs?: { [key: string]: any }
  ) {
    var hasList = optionalArgs?.list && optionalArgs.list.length > 0;
    return (
      <div className="mb-4">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            type="text"
            name={name}
            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder={placeholder}
            value={stateVariable}
            onChange={onChangeFn}
            list={hasList ? `${name}-data-list` : ''}
          />
        </div>
        {hasList ? <datalist id={`${name}-data-list`}>{optionalArgs?.list}</datalist> : ''}
        {optionalArgs?.footnote ? <p className="mt-2 text-xs ml-0 text-gray-500">{optionalArgs?.footnote}</p> : ''}
      </div>
    );
  }

  function getTokenNameFromAddress(tokenAddress: string) {
    for (let [token, address] of Object.entries(config[chain].tokens)) {
      if (address == tokenAddress) return token;
    }
    return formatAddress(tokenAddress);
  }

  function showFlashMessage(msg: FlashState) {
    props.setFlashMessage(msg);
    setTimeout(() => props.setFlashMessage(undefined), 50000);
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-10 col-start-2 lg:col-span-3 lg:col-start-2">
        <h2 className="text-gray-500">01</h2>
        <h1>TENDERLY INFO</h1>
      </div>
      <div className="col-span-10 col-start-2 lg:col-span-6 lg:mt-10">
        <ForkUrlInput
          chain={chain}
          forkUrl={forkUrl}
          handleChange={handleChange}
          setForkUrl={setForkUrl}
          showFlashMessage={showFlashMessage}
          setChain={setChain}
        />
        <ChainSelect chain={chain} handleChange={handleChange} setChain={setChain}></ChainSelect>
      </div>
      <div className="col-span-10 col-start-2 lg:col-span-3 lg:col-start-2">
        <h2 className="text-gray-500">02</h2>
        <h1>TX INFO</h1>
      </div>
      <div className="col-span-10 col-start-2 lg:col-span-6 lg:mt-10">
        {renderInputGroup('toAddress', 'To address', '0x123..abc', toAddress, (event: ChangeEvent) =>
          handleChange((event.target as HTMLInputElement).name, (event.target as HTMLInputElement).value, setToAddress)
        )}

        {renderInputGroup('tokenAmount', 'Amount', '1000', tokenAmount, (event: ChangeEvent) =>
          handleChange(
            (event.target as HTMLInputElement).name,
            (event.target as HTMLInputElement).value,
            setTokenAmount
          )
        )}

        {renderInputGroup(
          'tokenAddress',
          'Token address',
          '0x123...abc',
          tokenAddress,
          (event: ChangeEvent<HTMLInputElement>) => handleTokenChange(event),
          { list: getTokenAddressOptions() }
        )}

        {renderInputGroup(
          'holderAddresses',
          'Holder addresses',
          '0x123...abc, 0x234...def',
          holderAddresses,
          (event: ChangeEvent) =>
            handleChange(
              (event.target as HTMLInputElement).name,
              (event.target as HTMLInputElement).value,
              setHolderAddresses
            ),
          { footnote: 'Addresses must be separated by commas' }
        )}
      </div>

      <SubmitButton handleSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
