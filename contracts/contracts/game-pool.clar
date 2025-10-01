;; AgarCoin Game Pool Contract
;; Manages betting pools for multiplayer Agar.io games

;; Constants
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-GAME-FULL (err u402))
(define-constant ERR-GAME-NOT-WAITING (err u403))
(define-constant ERR-INSUFFICIENT-PAYMENT (err u404))
(define-constant ERR-GAME-NOT-ACTIVE (err u405))
(define-constant ERR-INVALID-WINNER-COUNT (err u406))
(define-constant ERR-GAME-NOT-FOUND (err u407))

(define-constant HOUSE-FEE-PERCENTAGE u20) ;; 20%
(define-constant MAX-PLAYERS u20)
(define-constant MAX-WINNERS u3)

;; Game status enum
(define-constant GAME-STATUS-WAITING u0)
(define-constant GAME-STATUS-ACTIVE u1)
(define-constant GAME-STATUS-FINISHED u2)

;; Data Variables
(define-data-var next-game-id uint u0)
(define-data-var contract-owner principal tx-sender)

;; Maps
(define-map game-pools
  { game-id: uint }
  {
    authority: principal,
    entry-fee: uint,
    max-players: uint,
    current-players: uint,
    total-pool: uint,
    status: uint,
    start-time: uint,
    end-time: uint
  }
)

(define-map player-entries
  { game-id: uint, player: principal }
  {
    entry-time: uint,
    paid: bool
  }
)

;; Prize distribution percentages (50%, 30%, 20%)
(define-constant PRIZE-PERCENTAGES (list u50 u30 u20))

;; Public Functions

;; Initialize a new game pool
(define-public (initialize-game-pool (entry-fee uint) (max-players uint))
  (let 
    (
      (game-id (var-get next-game-id))
    )
    (map-set game-pools 
      { game-id: game-id }
      {
        authority: tx-sender,
        entry-fee: entry-fee,
        max-players: (if (<= max-players MAX-PLAYERS) max-players MAX-PLAYERS),
        current-players: u0,
        total-pool: u0,
        status: GAME-STATUS-WAITING,
        start-time: u0,
        end-time: u0
      }
    )
    (var-set next-game-id (+ game-id u1))
    (ok game-id)
  )
)

;; Join an existing game
(define-public (join-game (game-id uint))
  (let 
    (
      (game-pool (unwrap! (map-get? game-pools { game-id: game-id }) ERR-GAME-NOT-FOUND))
      (entry-fee (get entry-fee game-pool))
      (current-players (get current-players game-pool))
      (max-players (get max-players game-pool))
    )
    ;; Validate game can accept new players
    (asserts! (< current-players max-players) ERR-GAME-FULL)
    (asserts! (is-eq (get status game-pool) GAME-STATUS-WAITING) ERR-GAME-NOT-WAITING)
    
    ;; Transfer STX from player to contract
    (try! (stx-transfer? entry-fee tx-sender (as-contract tx-sender)))
    
    ;; Record player entry
    (map-set player-entries 
      { game-id: game-id, player: tx-sender }
      { entry-time: stacks-block-height, paid: true }
    )
    
    ;; Update game pool
    (map-set game-pools 
      { game-id: game-id }
      (merge game-pool 
        { 
          current-players: (+ current-players u1),
          total-pool: (+ (get total-pool game-pool) entry-fee)
        }
      )
    )
    
    (ok true)
  )
)

;; Start the game (only authority can call)
(define-public (start-game (game-id uint))
  (let 
    (
      (game-pool (unwrap! (map-get? game-pools { game-id: game-id }) ERR-GAME-NOT-FOUND))
    )
    ;; Check authorization
    (asserts! (is-eq tx-sender (get authority game-pool)) ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (get status game-pool) GAME-STATUS-WAITING) ERR-GAME-NOT-WAITING)
    
    ;; Update game status to active
    (map-set game-pools 
      { game-id: game-id }
      (merge game-pool 
        { 
          status: GAME-STATUS-ACTIVE,
          start-time: stacks-block-height
        }
      )
    )
    
    (ok true)
  )
)

;; End game and distribute prizes
(define-public (end-game-and-distribute (game-id uint) (winners (list 3 principal)))
  (let 
    (
      (game-pool (unwrap! (map-get? game-pools { game-id: game-id }) ERR-GAME-NOT-FOUND))
      (total-pool (get total-pool game-pool))
      (house-fee (/ (* total-pool HOUSE-FEE-PERCENTAGE) u100))
      (prize-pool (- total-pool house-fee))
    )
    ;; Check authorization
    (asserts! (is-eq tx-sender (get authority game-pool)) ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (get status game-pool) GAME-STATUS-ACTIVE) ERR-GAME-NOT-ACTIVE)
    (asserts! (<= (len winners) MAX-WINNERS) ERR-INVALID-WINNER-COUNT)
    
    ;; Distribute prizes to winners
    (try! (distribute-prizes winners prize-pool))
    
    ;; Transfer house fee to contract owner
    (try! (as-contract (stx-transfer? house-fee tx-sender (var-get contract-owner))))
    
    ;; Update game status to finished
    (map-set game-pools 
      { game-id: game-id }
      (merge game-pool 
        { 
          status: GAME-STATUS-FINISHED,
          end-time: stacks-block-height
        }
      )
    )
    
    (ok true)
  )
)

;; Private Functions


(define-private (distribute-prizes (winners (list 3 principal)) (prize-pool uint))
  (let 
    (
      (winner-count (len winners))
      (first-prize (/ (* prize-pool u50) u100))
      (second-prize (/ (* prize-pool u30) u100))
      (third-prize (/ (* prize-pool u20) u100))
    )
    (begin
      ;; Always pay 1st place (required)
      (try! (as-contract (stx-transfer? 
        first-prize 
        tx-sender 
        (unwrap! (element-at winners u0) (err u100))
      )))
      
      ;; Pay 2nd place if exists
      (and (> winner-count u1)
        (unwrap-panic (as-contract (stx-transfer? 
          second-prize 
          tx-sender 
          (unwrap! (element-at winners u1) (err u101))
        )))
      )
      
      ;; Pay 3rd place if exists
      (and (> winner-count u2)
        (unwrap-panic (as-contract (stx-transfer? 
          third-prize 
          tx-sender 
          (unwrap! (element-at winners u2) (err u102))
        )))
      )
      
      (ok true)
    )
  )
)

;; Read-only functions

(define-read-only (get-game-pool (game-id uint))
  (map-get? game-pools { game-id: game-id })
)

(define-read-only (get-player-entry (game-id uint) (player principal))
  (map-get? player-entries { game-id: game-id, player: player })
)

(define-read-only (get-next-game-id)
  (var-get next-game-id)
)

(define-read-only (is-player-in-game (game-id uint) (player principal))
  (is-some (map-get? player-entries { game-id: game-id, player: player }))
)

(define-read-only (calculate-prizes (total-pool uint))
  (let 
    (
      (house-fee (/ (* total-pool HOUSE-FEE-PERCENTAGE) u100))
      (prize-pool (- total-pool house-fee))
    )
    {
      house-fee: house-fee,
      prize-pool: prize-pool,
      first-place: (/ (* prize-pool u50) u100),
      second-place: (/ (* prize-pool u30) u100),
      third-place: (/ (* prize-pool u20) u100)
    }
  )
)

