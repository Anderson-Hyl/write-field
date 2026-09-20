-- Writing simulation, 2026-09-19. Standalone; base only.
-- These concrete outputs are evidence for these inputs, not a proof of laws.
import Text.Read (readMaybe)

main :: IO ()
main = do
  print (map (readMaybe :: String -> Maybe Int) ["12", "oops", "7"])
  print (traverse (readMaybe :: String -> Maybe Int) ["12", "oops", "7"])
  print (traverse (readMaybe :: String -> Maybe Int) ["12", "8", "7"])
  print (traverse (\x -> [x, -x]) [1, 2 :: Int])
