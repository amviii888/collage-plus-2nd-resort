import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let bridgeVC = CAPBridgeViewController()
        let win = UIWindow(windowScene: windowScene)
        win.rootViewController = bridgeVC
        win.makeKeyAndVisible()
        self.window = win

        // Activate hardware-level screenshot and screen recording blackout
        HardwareSecurityManager.shared.configureProtection(for: win, bridgeController: bridgeVC)

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        HardwareSecurityManager.shared.verifyProtection()
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

// MARK: - Hardware Level Screenshot & Screen Recording Prevention
// Uses iOS FairPlay / RenderServer secure surface (UITextField.isSecureTextEntry)
// Any screenshot or screen recording captured by iOS hardware is rendered pitch black at the compositor level.
final class HardwareSecurityManager {
    static let shared = HardwareSecurityManager()

    private weak var targetWindow: UIWindow?
    private weak var targetViewController: UIViewController?
    private var blackRecordingOverlay: UIView?
    private let secureTextField = UITextField()
    private var isConfigured = false

    private init() {
        setupObservers()
    }

    func configureProtection(for window: UIWindow, bridgeController: UIViewController) {
        self.targetWindow = window
        self.targetViewController = bridgeController

        DispatchQueue.main.async { [weak self] in
            self?.applyHardwareSecureSurface()
            self?.updateRecordingProtection()
        }
    }

    func verifyProtection() {
        DispatchQueue.main.async { [weak self] in
            self?.applyHardwareSecureSurface()
            self?.updateRecordingProtection()
        }
    }

    private func setupObservers() {
        // 1. Screen recording (Control Center, AirPlay mirroring, QuickTime USB screen recording)
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleScreenCapturedChanged),
            name: UIScreen.capturedDidChangeNotification,
            object: nil
        )

        // 2. User took screenshot notification (hardware blackout verification)
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleUserDidTakeScreenshot),
            name: UIApplication.userDidTakeScreenshotNotification,
            object: nil
        )
    }

    private func applyHardwareSecureSurface() {
        guard let window = targetWindow else { return }
        if isConfigured && window.viewWithTag(998877) != nil { return }

        secureTextField.tag = 998877
        secureTextField.isSecureTextEntry = true
        secureTextField.isUserInteractionEnabled = false

        if secureTextField.superview == nil {
            window.addSubview(secureTextField)
            secureTextField.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                secureTextField.topAnchor.constraint(equalTo: window.topAnchor),
                secureTextField.bottomAnchor.constraint(equalTo: window.bottomAnchor),
                secureTextField.leadingAnchor.constraint(equalTo: window.leadingAnchor),
                secureTextField.trailingAnchor.constraint(equalTo: window.trailingAnchor)
            ])
        }

        // Reparent window layer under secure surface layer
        if let secureLayer = secureTextField.layer.sublayers?.first {
            window.layer.superlayer?.addSublayer(secureTextField.layer)
            secureLayer.addSublayer(window.layer)
            isConfigured = true
        }
    }

    @objc private func handleScreenCapturedChanged() {
        updateRecordingProtection()
    }

    @objc private func handleUserDidTakeScreenshot() {
        flashBlackCurtain()
    }

    private func updateRecordingProtection() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let window = self.targetWindow else { return }
            let isCaptured = UIScreen.main.isCaptured

            if isCaptured {
                if self.blackRecordingOverlay == nil {
                    let overlay = UIView(frame: window.bounds)
                    overlay.backgroundColor = .black
                    overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]

                    let label = UILabel()
                    label.text = "Screen Recording Prohibited"
                    label.textColor = UIColor(white: 0.3, alpha: 1.0)
                    label.font = UIFont.systemFont(ofSize: 15, weight: .bold)
                    label.sizeToFit()
                    label.center = overlay.center
                    label.autoresizingMask = [.flexibleTopMargin, .flexibleBottomMargin, .flexibleLeftMargin, .flexibleRightMargin]
                    overlay.addSubview(label)

                    window.addSubview(overlay)
                    self.blackRecordingOverlay = overlay
                }
                self.blackRecordingOverlay?.isHidden = false
                window.bringSubviewToFront(self.blackRecordingOverlay!)
            } else {
                self.blackRecordingOverlay?.isHidden = true
            }
        }
    }

    private func flashBlackCurtain() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let window = self.targetWindow else { return }
            let curtain = UIView(frame: window.bounds)
            curtain.backgroundColor = .black
            curtain.alpha = 1.0
            window.addSubview(curtain)
            window.bringSubviewToFront(curtain)

            UIView.animate(withDuration: 0.4, delay: 0.05, options: .curveEaseOut, animations: {
                curtain.alpha = 0.0
            }, completion: { _ in
                curtain.removeFromSuperview()
            })
        }
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }
}
