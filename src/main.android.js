import Cycle from '@cycle/core';
import {Observable} from 'rx';
import {makeHTTPDriver} from '@cycle/http';
import {makeReactNativeDriver} from '@cycle/react-native';
import switchPath from 'switch-path';
import UsersList from './pages/UsersList/index.android';
import UserAccountsList from './pages/UserAccountsList/index.android';
import TransactionsList from './pages/TransactionsList/index.android';
import NewPayment from './pages/NewPayment/index.android';
import API_KEY from './apikey';

function AccountsListForUser(userId) {
  const props$ = Observable.just({userId});
  return (sources) => UserAccountsList({...sources, props$});
}

function TransactionsListForAccount(accountId) {
  const props$ = Observable.just({accountId});
  return (sources) => TransactionsList({...sources, props$});
}

function NewPaymentForAccount(accountId) {
  const props$ = Observable.just({accountId});
  return (sources) => NewPayment({...sources, props$});
}

function augmentRequestWithAPIKey(request) {
  return {...request,
    query: {...request.query, apikey: API_KEY},
  };
}

function Main(sources) {
  const sinks$ = sources.History.map(location => {
    const pathAndValue = switchPath(location.pathname, {
      '/': UsersList,
      '/users/:id': id => AccountsListForUser(id),
      '/transactions/:id': id => TransactionsListForAccount(id),
      '/transactions/:id/new': id => NewPaymentForAccount(id),
    });
    const component = pathAndValue.value;
    return component(sources);
  }).shareReplay(1);

  return {
    RN: sinks$.flatMapLatest(s => s.RN),
    HTTP: sinks$.flatMapLatest(s => s.HTTP).map(augmentRequestWithAPIKey),
    History: sinks$.flatMapLatest(s => s.link),
  };
}

function historyDriver(sink$) {
  return sink$.startWith('/').map(url => ({pathname: url}));
}

const drivers = {
  RN: makeReactNativeDriver('OPMobileTemplate'),
  HTTP: makeHTTPDriver(),
  History: historyDriver,
};

Cycle.run(Main, drivers);
