import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

export default function Home() {
  return (
    <Layout title="MODL Documentation" description="Developer docs for the MODL Uniswap v4 aggregator">
      <main className={styles.heroWrapper}>
        <section className={styles.hero}>
          <h1>MODL Developer Hub</h1>
          <p>
            Build composable Uniswap v4 hooks with gas-aware routing, deterministic module ordering,
            and reusable tooling.
          </p>
          <div className={styles.ctaRow}>
            <Link className="button button--primary" to="/docs/">
              Read the docs
            </Link>
            <Link className="button button--secondary" to="https://github.com/migarci2/modl">
              View on GitHub
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
