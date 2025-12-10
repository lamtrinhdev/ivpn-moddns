// /src/guides/windows.ts
export const windowsBadges = [
  { label: "Windows" },
  { label: "DNS over HTTPS" },
];

// Copy-to-clipboard code block (mirrors Browsers guide styling)
import CodeBlock from '@/components/setup/CodeBlock';

// Using shared CodeBlock component

interface WindowsGuideDeps {
  dohEndpoint: string; // fully constructed DoH URL with profile id
  primaryIp: string;
}

export const createWindowsSteps = (deps: WindowsGuideDeps) => {
  const { dohEndpoint, primaryIp } = deps;
  const doh = dohEndpoint;
  return [
    {
      step: 1,
      instruction: (
        <span>
          Go to Windows <em>Settings &gt; Network &amp; internet</em>
        </span>
      ),
    },
    {
      step: 2,
      instruction: (
        <span>
          Click <em>Wi-Fi &gt; Hardware properties</em>, or click <em>Ethernet</em>
        </span>
      ),
    },
    {
      step: 3,
      instruction: (
        <span>
          Click the <em>Edit</em> button beside <em>DNS server assignment</em>
        </span>
      ),
    },
    {
      step: 4,
      instruction: (
        <span>
          Select <em>Manual</em> and toggle <em>IPv4</em> to <em>On</em>
        </span>
      ),
    },
    {
      step: 5,
      instruction: (
        <span>
          In the <em>Preferred DNS</em> field, enter the {primaryIp} IP address
        </span>
      ),
    },
    {
      step: 6,
      instruction: (
        <span>
          Toggle <em>DNS over HTTPS</em> to <em>On (manual template)</em>
        </span>
      ),
    },
    {
      step: 7,
      instruction: (
        <span>
          Add your DNS query URI  to the <em>DNS over HTTPS template</em> field:
          <br />
          <CodeBlock value={doh} />
        </span>
      ),
    },
    {
      step: 8,
      instruction: (
        <span>
          Click <em>Save</em>
        </span>
      ),
    },
  ];
};

// No static steps exported now; consumer (RightPanelGuide) must inject deps.
// Provide a convenience factory should some part of app want a one-off eager object.
export const buildWindowsGuide = (deps: WindowsGuideDeps) => ({
  badges: windowsBadges,
  steps: createWindowsSteps(deps)
});

export default {
  badges: windowsBadges,
  createWindowsSteps,
  buildWindowsGuide,
};