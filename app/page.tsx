import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameInput,
  FrameReducer,
  NextServerPageProps,
  getFrameMessage,
  getPreviousFrame,
  useFramesReducer,
} from "frames.js/next/server";
import Link from "next/link";
import { DEBUG_HUB_OPTIONS } from "./debug/constants";

type State = {
  active: string;
  total_button_presses: number;
};

const initialState = { active: "1", total_button_presses: 0 };

const reducer: FrameReducer<State> = (state, action) => {
  return {
    total_button_presses: state.total_button_presses + 1,
    active: action.postBody?.untrustedData.buttonIndex
      ? String(action.postBody?.untrustedData.buttonIndex)
      : "1",
  };
};

// This is a react server component only
export default async function Home({
  params,
  searchParams,
}: NextServerPageProps) {
  const previousFrame = getPreviousFrame<State>(searchParams);

  const frameMessage = await getFrameMessage(previousFrame.postBody, {
    ...DEBUG_HUB_OPTIONS,
  });

  if (frameMessage && !frameMessage?.isValid) {
    throw new Error("Invalid frame payload");
  }

  const [state, dispatch] = useFramesReducer<State>(
    reducer,
    initialState,
    previousFrame,
  );

  console.log("info: state is:", state);

  type Datum = {
    snapshot_date: string;
    user_rank: string;
    wallet_address: string;
    avatar_url: string;
    display_name: string;
    tip_allowance: string;
    remaining_allowance: string;
    points: string;
  };

  type DegenAllowance = {
    snapshot_date: string;
    user_rank: string;
    wallet_address: string;
    avatar_url: string;
    display_name: string;
    tip_allowance: string;
    remaining_allowance: string;
  };

  type DegenPoints = {
    avatar_url: string;
    display_name: string;
    points: string;
  };

  // if (frameMessage) {
  // const {
  //   isValid,
  //   buttonIndex,
  //   inputText,
  //   castId,
  //   requesterFid,
  //   casterFollowsRequester,
  //   requesterFollowsCaster,
  //   likedCast,
  //   recastedCast,
  //   requesterCustodyAddress,
  //   requesterVerifiedAddresses,
  //   requesterUserData,
  // } = frameMessage;

  // }

  const baseUrl = process.env.NEXT_PUBLIC_HOST || "http://localhost:3000";

  const fetchAllowance = async (id: string) => {
    const res = await fetch(
      id.startsWith("0x")
        ? `https://www.degen.tips/api/airdrop2/tip-allowance?wallet_address=${id}`
        : `https://www.degen.tips/api/airdrop2/tip-allowance?fid=${id}`,
    );

    return (await res.json()) as DegenAllowance[];
  };

  const fetchPoints = async (id: string) => {
    const res = await fetch(
      `https://www.degen.tips/api/airdrop2/points?address=${id}`,
    );
    return (await res.json()) as DegenPoints[];
  };

  const renderData = async () => {
    if (!frameMessage)
      return (
        <div tw="flex items-center justify-center w-full h-full bg-slate-700 text-black">
          <div tw="flex justify-start items-center flex-wrap bg-white rounded-lg shadow-md max-w-2xl p-12 text-5xl">
            <span>Click</span>
            <span
              tw="p-2 bg-slate-200 rounded-lg ml-2 font-bold border-slate-400 border-2"
              className="border-slate-600 border-2"
            >
              Check $DEGEN
            </span>{" "}
            <span>
              below to see your $DEGEN stats. Enter a wallet or fid to check
              someone else's stats.
            </span>
          </div>
        </div>
      );

    let id = frameMessage.inputText || `${frameMessage.requesterFid}`;

    let datum = [];

    const allowances = await fetchAllowance(id);
    datum.push(...allowances);

    let results = datum.map(async (d) => {
      if (!d.wallet_address) return d;
      const points = await fetchPoints(d.wallet_address);
      const point = points.find((p) => p.display_name === d.display_name);
      console.log("in", point);
      return {
        ...d,
        points: point?.points || "Unknown",
      } as Datum;
    });
    datum = (await Promise.all(results)) as Datum[];

    const renderedID = id.startsWith("0x")
      ? `${id.slice(0, 6)}...${id.slice(id.length - 6, id.length)}`
      : id;

    // datum.push(datum[0]!);

    // Only enough room to return the first 4
    datum = datum.slice(0, 4);

    const len = datum.length;
    const cardStyle = {
      padding: len > 2 ? 10 : len > 1 ? 20 : 40,
    } as React.CSSProperties;
    const containerStyle = {
      flexWrap: len > 2 ? "wrap" : "nowrap",
      justifyContent: len > 1 ? "space-around" : "center",
      alignItems: len > 1 ? "flex-start" : "center",
      padding: len > 2 ? 25 : 40,
    } as React.CSSProperties;

    return (
      <div
        style={containerStyle}
        tw="flex flex-row w-full h-full bg-slate-700 text-black"
      >
        {datum.map((data, i) => (
          <div
            style={cardStyle}
            tw="flex flex-col bg-white rounded-lg shadow-md mb-4"
          >
            <div
              style={{
                display: "flex",
                fontSize: 60,
                alignItems: "flex-start",
              }}
              key={data.display_name || `${i}`}
            >
              {data.avatar_url && (
                <img
                  src={data.avatar_url}
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "50%",
                    marginRight: 20,
                  }}
                />
              )}
              <div tw="flex flex-col text-4xl">
                <span>
                  {data.display_name ||
                    (renderedID.startsWith("0x")
                      ? renderedID
                      : `Fid: ${renderedID}`)}
                </span>
                <span>Rank {data.user_rank}</span>
              </div>
            </div>
            <span style={{ display: "flex", flexWrap: "wrap" }}>
              Points - {data.points}
            </span>
            <span style={{ display: "flex", flexWrap: "wrap" }}>
              Allowance - {data.tip_allowance} $DEGEN
            </span>
            <span style={{ display: "flex", flexWrap: "wrap" }}>
              Remaining - {data.remaining_allowance} $DEGEN
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4">
      frames.js starter kit. The Template Frame is on this page, it&apos;s in
      the html meta tags (inspect source).{" "}
      <Link href={`/debug?url=${baseUrl}`} className="underline">
        Debug
      </Link>
      <FrameContainer
        postUrl="/frames"
        pathname="/"
        state={state}
        previousFrame={previousFrame}
      >
        <FrameImage aspectRatio="1.91:1">{await renderData()}</FrameImage>
        <FrameInput text="Optional Wallet or FID" />
        <FrameButton>Check $DEGEN</FrameButton>
        <FrameButton action="link" target="https://www.degen.tips/airdrop2">
          degen.tips
        </FrameButton>
      </FrameContainer>
    </div>
  );
}
