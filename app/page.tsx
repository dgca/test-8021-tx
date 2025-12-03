"use client";
import { useEffect, useState } from "react";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import {
  useSendCalls,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { Attribution } from "ox/erc8021";
import { encodeFunctionData } from "viem";
import styles from "./page.module.css";
import {
  Address,
  Avatar,
  EthBalance,
  Identity,
  Name,
} from "@coinbase/onchainkit/identity";

const GUESTBOOK_ADDRESS = "0x9805D57A15c014c6C18fE2D237cbB1784795CB1E";

const GUESTBOOK_ABI = [
  {
    inputs: [],
    name: "getEntries",
    outputs: [
      {
        components: [
          { internalType: "address", name: "from", type: "address" },
          { internalType: "string", name: "message", type: "string" },
        ],
        internalType: "struct GuestBook.Entry[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "_message", type: "string" }],
    name: "sign",
    outputs: [
      {
        components: [
          { internalType: "address", name: "from", type: "address" },
          { internalType: "string", name: "message", type: "string" },
        ],
        internalType: "struct GuestBook.Entry",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: ["8021-guestbook"],
});

export default function Home() {
  const [message, setMessage] = useState("");
  const [lastAction, setLastAction] = useState<string>("");

  // writeContract hooks
  const {
    writeContract,
    data: hash,
    error: writeError,
    isPending: isWritePending,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isWriteSuccess } =
    useWaitForTransactionReceipt({
      hash,
    });

  // sendCalls hooks
  const {
    sendCalls,
    data: callsId,
    error: callsError,
    isPending: isCallsPending,
  } = useSendCalls();

  useEffect(() => {
    if (isWriteSuccess || callsId) {
      setMessage("");
    }
  }, [isWriteSuccess, callsId]);

  const isPending = isWritePending || isConfirming || isCallsPending;

  const handleWriteContract = (withAttribution: boolean) => {
    if (!message.trim()) return;
    setLastAction(
      withAttribution ? "writeContract-with" : "writeContract-without"
    );

    if (withAttribution) {
      writeContract({
        address: GUESTBOOK_ADDRESS,
        abi: GUESTBOOK_ABI,
        functionName: "sign",
        args: [message],
        dataSuffix: DATA_SUFFIX,
      });
    } else {
      writeContract({
        address: GUESTBOOK_ADDRESS,
        abi: GUESTBOOK_ABI,
        functionName: "sign",
        args: [message],
      });
    }
  };

  const handleSendCalls = (withAttribution: boolean) => {
    if (!message.trim()) return;
    setLastAction(withAttribution ? "sendCalls-with" : "sendCalls-without");

    if (withAttribution) {
      sendCalls({
        calls: [
          {
            to: GUESTBOOK_ADDRESS,
            data: encodeFunctionData({
              abi: GUESTBOOK_ABI,
              functionName: "sign",
              args: [message],
            }),
          },
        ],
        capabilities: {
          dataSuffix: DATA_SUFFIX,
        },
      });
    } else {
      sendCalls({
        calls: [
          {
            to: GUESTBOOK_ADDRESS,
            data: encodeFunctionData({
              abi: GUESTBOOK_ABI,
              functionName: "sign",
              args: [message],
            }),
          },
        ],
      });
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.headerWrapper}>
        <Wallet>
          <ConnectWallet />
          <WalletDropdown>
            <Identity>
              <Avatar />
              <Name />
              <Address />
              <EthBalance />
            </Identity>
            <Address />
            <EthBalance />
            <WalletDropdownDisconnect />
          </WalletDropdown>
        </Wallet>
      </header>

      <div className={styles.content}>
        <h1>
          ERC-8021 Guestbook
          <br />
          (non-mini-app)
        </h1>

        <div className={styles.form}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Leave your message..."
            className={styles.textarea}
            rows={4}
            disabled={isPending}
          />

          <div className={styles.buttonGroup}>
            <div className={styles.column}>
              <h3 className={styles.columnTitle}>With Attribution</h3>
              <button
                onClick={() => handleWriteContract(true)}
                disabled={!message.trim() || isPending}
                className={styles.button}
              >
                writeContract
              </button>
              <button
                onClick={() => handleSendCalls(true)}
                disabled={!message.trim() || isPending}
                className={styles.button}
              >
                sendCalls
              </button>
            </div>

            <div className={styles.column}>
              <h3 className={styles.columnTitle}>Without Attribution</h3>
              <button
                onClick={() => handleWriteContract(false)}
                disabled={!message.trim() || isPending}
                className={styles.buttonSecondary}
              >
                writeContract
              </button>
              <button
                onClick={() => handleSendCalls(false)}
                disabled={!message.trim() || isPending}
                className={styles.buttonSecondary}
              >
                sendCalls
              </button>
            </div>
          </div>
        </div>

        {hash && isWriteSuccess && (
          <div className={styles.success}>
            <p>Transaction successful!</p>
            <p className={styles.detail}>Method: {lastAction}</p>
            <a
              href={`https://basescan.org/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              View on BaseScan
            </a>
          </div>
        )}

        {callsId && (
          <div className={styles.success}>
            <p>Batch call submitted!</p>
            <p className={styles.detail}>Method: {lastAction}</p>
            <p className={styles.callsId}>Call ID: {callsId.id}</p>
          </div>
        )}

        {(writeError || callsError) && (
          <div className={styles.error}>
            <p>Error: {(writeError || callsError)?.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
