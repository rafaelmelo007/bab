class Bab < Formula
  desc "Unified CLI gateway to Claude, Codex, Gemini, and Ollama"
  homepage "https://github.com/owner/bab"
  url "https://registry.npmjs.org/bab/-/bab-VERSION.tgz"
  sha256 "SHA256_PLACEHOLDER"
  license any_of: ["MIT", "Apache-2.0"]

  depends_on "node"

  def install
    system "npm", "install", "-g",
           "--prefix=#{libexec}",
           "--ignore-scripts"
    bin.install_symlink Dir["#{libexec}/bin/*"]
    # Ensure bab finds the correct Node.js from Homebrew
    (bin/"bab").write_env_script libexec/"bin/bab",
      PATH: "#{Formula["node"].opt_bin}:$PATH"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/bab --version")
  end
end
