# ETH-USDC Exchange


## Introduction

a contract that allows users to deposit ETH, and switch to USDC using real-time price from chainlink oracle.

## deployment

1. deploy the implementation contract IMP

        ```
        IMP = new ExchangeImpl();
        ```
2. deploy the proxy contract PROXY

        ```
        exchange = new ExchangeProxy(%IMP%, %USDC_ADDRESS%);
        ```

3. connect the proxy to price feed
    
        ```
        exchange.setPriceFeed(%PRICE_FEED_ADDRESS%);
        ```


## usage

1. owner should deposit USDC to the contract in 2 ways:

    * transfer USDC to the contract address, then call `syncUSDC()` to update the balance

        ```
        usdc.transfer(exchange, amount);
        exchange.syncUSDC();
        ```

    * owner set approve for the contract, then call depositUSDC

        ```
        usdc.approve(exchange, amount);
        exchange.depositUSDC(amount);
        ```

1. now user can deposit eth and swap to USDC if he want


        ```
        exchange.depositEthAndSwapForUSDC{value: amount2}(amount1);
        ```

    user will get USDC transferred to his account, and the contract will keep the ETH.

1. user may check their eth balance

        ```
        exchange.ethCounts(address);
        ```

1. user may call withdrawEth(amount) to withdraw his ETH

        ```
        exchange.withdrawEth(amount);
        ```

1. anyone can call getEth() or getUSDC(amount) to get eth trade from user, or get USDC from the contract, they will be sent to the contract owner

        ```
        exchange.getEth();
        exchange.getUSDC(amount);
        ```

## Emergency & Maintenance

* owner can stop the swap function

        ```
        exchange.setSwapEnabled(false);
        ```

    in this case, user can only withdraw their eth, and the contract will not swap eth to USDC



## Further Improvement

* user may set minimum amount of USDC in swap function, so that the swap will not be executed if the amount is too small