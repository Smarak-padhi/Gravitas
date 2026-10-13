import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'

const ARTIFACT_DIR = 'C:/Users/smara/.gemini/antigravity/brain/3350c4d9-6ea0-45ca-aac9-280e00b5e1cf'
const LOCAL_DIR = path.resolve('docs/stitch-designs')

fs.mkdirSync(LOCAL_DIR, { recursive: true })
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
}

const screens = [
  {
    name: 'direction-a-desktop.png',
    url: 'https://lh3.googleusercontent.com/aida/AEtjO1Xulg7CIE2idEiiX5b6ar-6zzI7YvyaqEe4Z5TJ2JStqkojZJEu3WyKyKPWfIWELNlxfLWWw0mfSii5wQ3yp25sj2SOESVszgs48MK3f1h4f8YgXXF2QP14hvuyXYgLoWeQMW1IGd5yIrGsKAsE-bnI1Xq4DKdycmxAdN7mj_ZSyxCze4aem-w7z9kGvAHYUT0ImMtZkNJ7i6KmocIBWi87xQQZSrweCJ3ZJ33TEP81H6IQQGrVs8QQgejz'
  },
  {
    name: 'direction-a-mobile.png',
    url: 'https://lh3.googleusercontent.com/aida/AEtjO1UZ_s8iRoEGrKbB03d-ot2Z-K6Y0CFP4ns99wO1cnj0qhlhi_uP2uDASq-GaroJt9hrx72yj72fWI-1MVxfcGSdFacSVaaynDC_yvK6nTdXIXu-5cSap180g2l33Q4wa3UXcSY87nko4vthttjc5bG_6ogs48y0Jb_BcV64HSm0fNymIO0-DByPjg4AY0vPqnrJmTpnBtX3zuBtuKJKuVjyXK-1S4d72mPubyri8UTPQ3L6StCjk-yB0pye'
  },
  {
    name: 'direction-b-desktop.png',
    url: 'https://lh3.googleusercontent.com/aida/AEtjO1WXAwVpp_2paDjYOiE_PL9OXq4re0Cwr_hr34Eu2ZAqq3NT6f_6_QkMsbEKTiYV9bZ0wN631JkmjO0tAOOnNRgRNp4IZEwt5k6fzuTl5qpwV_Ni4CcQqrZL_FE8c8R39j7SxIzUmmlABgdrpyJWt-prX16hJfm9ixNtKWF3cq_ntcrAABP4MM-vig3ocp_1Y6zGeC7ef_22FIDhCuTX6mOJ75C65vOgIqmQjLlLwYgPEc7FTJfGb0RF__I'
  },
  {
    name: 'direction-b-mobile.png',
    url: 'https://lh3.googleusercontent.com/aida/AEtjO1V6CYyxYzPx2IY_h7wLCHtVZAmNaZQZFpedBHjlIg-Thadx0lYiH-D_tYni8ImIlDNgzeRAneo00qp7kOqeAPOqMwPhwmdaoMFLrMa223MEW8IWJq7vundmZKTeloslkSAsZsjsRZtNQN1oYozgviJl42fyM6puQY5FHjV23EZeR_p28SFIdsmacYfGpQcvXPxPFW5N3Z3zB6Q-bFL3ZHYA8BvbZgJmEjQRFP6ecKcPFRLKfMee4j-SAHSF'
  },
  {
    name: 'direction-c-desktop.png',
    url: 'https://lh3.googleusercontent.com/aida/AEtjO1Vtm4Ftn_oYeMwN23aY93XaGwrUbzFvHhfieEhwIGx4oSkCD3Uqmb-ct8MzkAk5Oi3x2r3QAsguy1xByVTrNesB79JelNEnc596ZGGUp2i_cU5iRyC43mdeMpE7bWoXXAXK6cxMvHZq2hN0KcFyFO67tXqY2_eNjGHJ6LyLfVa3Bw5rvFn1d9_zC61c31mZvlBE9NSzJCHMUfUn6YNznMcejGzXCUWZJ5b71EHcpkTuNeP_YDx591awuV5A'
  },
  {
    name: 'direction-c-mobile.png',
    url: 'https://lh3.googleusercontent.com/aida/AEtjO1WYe9dhzJJvJY3inSrJ0ZQclYhbqPMngVupRn9MccjMOmJM3IS5nXSZvRq9AahNoE-eW_F2TKXXN8D9RNUFFvmG7jPHQ2gPseGytaV6FWRnK_SNwvNL3dWDBhtqbssEeJQ67le6qIqwHgvnc0zdbktI33YM_MthMYo7ezo_d6rB7gshZAbPjKG6fyWcAopSMRWG1fTAjzMcA_vvC37EcAhz1Fl9WEZXc8Ui-Qy6VwKggeVfIIcskNx_kNSf'
  }
]

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: status code ${res.statusCode}`))
        return
      }
      res.pipe(file)
      file.on('finish', () => {
        file.close(resolve)
      })
    }).on('error', (err) => {
      fs.unlink(dest, () => {})
      reject(err)
    })
  })
}

async function run() {
  for (const s of screens) {
    const localPath = path.join(LOCAL_DIR, s.name)
    const artifactPath = path.join(ARTIFACT_DIR, s.name)
    console.log(`Downloading ${s.name}...`)
    await downloadFile(s.url, localPath)
    fs.copyFileSync(localPath, artifactPath)
    console.log(`Saved to ${localPath} and ${artifactPath}`)
  }
  console.log('All 6 screen designs successfully downloaded and mirrored!')
}

run().catch(console.error)
