type ParentMessage = {
  identifier: number;
  action: string;
  timeout?: number;
  times: number;
  random?: boolean;
  terminate?: boolean;
};

type ProducerResponse = {
  identifier: number;
  action: string;
  timeout?: number;
  times: number;
  random?: boolean;
  result?: string[];
};

const result: string[] = [];

process.on('message', (args: ParentMessage) => {
  const {identifier, action, timeout, times, random, terminate} = args;

  const tick = (count: number) => {
    const logParts: Array<string | number | boolean> = [Date.now(), 'PRODUCER', identifier, action];
    if (timeout) {
      logParts.push(timeout);
    }
    if (times && count) {
      logParts.push(`${count}/${times}`, random ?? false);
    }

    const log = logParts.join(' - ');
    result.push(log);

    const response: ProducerResponse = {identifier, action, timeout, times, random};
    if (result.length === times) {
      response.result = [...result];
    }

    process.send?.(response);
  };

  if (terminate) {
    const log = [Date.now(), 'PRODUCER', identifier, action, 'Quitting!'].join(' - ');
    console.log(log);
    process.exit(0);
  }

  if (!timeout) {
    tick(times);
    return;
  }

  const getTimeout = () => {
    if (!random) {
      return timeout;
    }
    return Math.floor(Math.random() * timeout);
  };

  let actionCount = 0;

  const iterator = () => {
    const currentTimeout = getTimeout();
    setTimeout(() => {
      actionCount += 1;
      tick(actionCount);
      if (actionCount < times) {
        iterator();
      }
    }, currentTimeout);
  };

  iterator();
});
